import { AccidentService } from "@core/service/accident";
import { AccidentType, AccidentStatus } from "@model/accident";
import { accidentRepository } from "@repository/index";

import { railRobotService } from "@service/index";

import { BadRequestError } from "@model/interface/error";

import { idGenerator } from "@utils/index";

import { z } from "zod";

export class AccidentServ implements AccidentService {
  async isExist(): Promise<boolean> {
    const [detectedAccident, alarmingAccident] = await Promise.all([
      accidentRepository.readByStatus(AccidentStatus.DETECTED),
      accidentRepository.readByStatus(AccidentStatus.ALARMING),
    ]);

    return detectedAccident.length > 0 || alarmingAccident.length > 0;
  }

  async get(): Promise<AccidentType> {
    const [detectedAccident, alarmingAccident] = await Promise.all([
      accidentRepository.readByStatus(AccidentStatus.DETECTED),
      accidentRepository.readByStatus(AccidentStatus.ALARMING),
    ]);

    return detectedAccident[0] || alarmingAccident[0];
  }

  async report(data: AccidentType): Promise<AccidentType> {
    if (await this.isExist()) {
      throw new BadRequestError("Accident data already in the database");
    }

    const reportSchema = z.object({
      location: z.number(),
      discoverorRobotId: z.string(),
    });

    const parseResult = reportSchema.safeParse(data);
    if (!parseResult.success) {
      throw new BadRequestError("location, discoverorRobotId is invalid");
    }

    const accidentId = idGenerator.generateId();

    const [accident, railRobot] = await Promise.all([
      accidentRepository.create({ ...data, id: accidentId }),
      railRobotService.stop(data.discoverorRobotId),
    ]);
    return accident;
  }

  async ignore(): Promise<AccidentType> {
    const currentAccident = await this.get();

    if (!currentAccident) {
      throw new BadRequestError("No Accident data in the database");
    }

    return await accidentRepository.update({
      ...currentAccident,
      status: AccidentStatus.IGNORED,
    });
  }

  async startAlarm(): Promise<AccidentType> {
    const currentAccident = await this.get();

    if (!currentAccident) {
      throw new BadRequestError("No Accident data in the database");
    }

    return await accidentRepository.update({
      ...currentAccident,
      status: AccidentStatus.ALARMING,
    });
  }

  async endAlarm(): Promise<AccidentType> {
    const currentAccident = await this.get();

    if (!currentAccident) {
      throw new BadRequestError("No Accident data in the database");
    }

    return await accidentRepository.update({
      ...currentAccident,
      status: AccidentStatus.END,
    });
  }
}
